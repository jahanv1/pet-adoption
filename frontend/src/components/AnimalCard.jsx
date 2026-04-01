const STATUS_LABELS = { available: 'Available', adopted: 'Adopted', fostered: 'Fostered' }

export default function AnimalCard({ animal }) {
  const gender = animal.gender === 'Male' ? 'M' : 'F'

  return (
    <div className="animal-card">
      <div className="animal-card-img">
        <img src={animal.image_url} alt={animal.name} />
        <span className={`ac-badge ac-badge-${animal.status}`}>
          {STATUS_LABELS[animal.status] || animal.status}
        </span>
      </div>
      <div className="animal-card-body">
        <div className="ac-header">
          <div className="animal-card-name">{animal.name}</div>
          <span className="ac-gender">{gender}</span>
        </div>
        <div className="animal-card-meta">{animal.species} · {animal.breed}</div>
        <div className="animal-card-meta">{animal.age} {animal.age === 1 ? 'year' : 'years'} old</div>
        {animal.description && (
          <div className="animal-card-desc">{animal.description}</div>
        )}
      </div>
    </div>
  )
}
